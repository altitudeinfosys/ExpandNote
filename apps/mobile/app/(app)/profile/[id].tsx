import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/lib/supabase';
import type { Tag, AIProvider, TriggerMode, OutputBehavior } from '@expandnote/shared/types';

const AI_PROVIDER_OPTIONS: { label: string; value: AIProvider }[] = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'Claude', value: 'claude' },
  { label: 'OpenRouter', value: 'openrouter' },
];

const MODEL_OPTIONS: Record<AIProvider, { label: string; value: string }[]> = {
  openai: [
    { label: 'GPT-4o', value: 'gpt-4o' },
    { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
    { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
  ],
  claude: [
    { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-latest' },
    { label: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku-latest' },
    { label: 'Claude 3 Opus', value: 'claude-3-opus-latest' },
  ],
  openrouter: [
    { label: 'GPT-4o (OpenRouter)', value: 'openai/gpt-4o' },
    { label: 'Claude 3.5 Sonnet (OpenRouter)', value: 'anthropic/claude-3.5-sonnet' },
  ],
};

const OUTPUT_BEHAVIOR_OPTIONS: { label: string; value: OutputBehavior }[] = [
  { label: 'Append to note', value: 'append' },
  { label: 'Replace content', value: 'replace' },
  { label: 'Create new note', value: 'new_note' },
];

const TRIGGER_MODE_OPTIONS: { label: string; value: TriggerMode }[] = [
  { label: 'Manual only', value: 'manual' },
  { label: 'Automatic on tag', value: 'automatic' },
];

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [aiProvider, setAiProvider] = useState<AIProvider>('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPromptTemplate, setUserPromptTemplate] = useState('');
  const [outputBehavior, setOutputBehavior] = useState<OutputBehavior>('append');
  const [outputTitleTemplate, setOutputTitleTemplate] = useState('');
  const [triggerMode, setTriggerMode] = useState<TriggerMode>('manual');
  const [tagId, setTagId] = useState<string>('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchTags();
    if (!isNew) {
      fetchProfile();
    }
  }, [id]);

  const fetchTags = async () => {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data) {
      setAllTags(data);
      // Set default tag if available and creating new profile
      if (isNew && data.length > 0) {
        setTagId(data[0].id);
      }
    }
  };

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('ai_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile');
      router.back();
    } else if (data) {
      setName(data.name);
      setAiProvider(data.ai_provider);
      setModel(data.model);
      setSystemPrompt(data.system_prompt || '');
      setUserPromptTemplate(data.user_prompt_template || '');
      setOutputBehavior(data.output_behavior);
      setOutputTitleTemplate(data.output_title_template || '');
      setTriggerMode(data.trigger_mode);
      setTagId(data.tag_id);
      setIsActive(data.is_active);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a profile name');
      return;
    }

    if (!userPromptTemplate.trim()) {
      Alert.alert('Error', 'Please enter a user prompt template');
      return;
    }

    if (!tagId) {
      Alert.alert('Error', 'Please select a tag');
      return;
    }

    setIsSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Error', 'You must be signed in');
      setIsSaving(false);
      return;
    }

    const profileData = {
      name: name.trim(),
      ai_provider: aiProvider,
      model,
      system_prompt: systemPrompt.trim(),
      user_prompt_template: userPromptTemplate.trim(),
      output_behavior: outputBehavior,
      output_title_template: outputTitleTemplate.trim() || null,
      trigger_mode: triggerMode,
      tag_id: tagId,
      is_active: isActive,
      user_id: user.id,
    };

    let error;
    if (isNew) {
      const result = await supabase
        .from('ai_profiles')
        .insert(profileData);
      error = result.error;
    } else {
      const result = await supabase
        .from('ai_profiles')
        .update(profileData)
        .eq('id', id);
      error = result.error;
    }

    setIsSaving(false);

    if (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    } else {
      router.back();
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Profile',
      'Are you sure you want to delete this profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('ai_profiles')
              .delete()
              .eq('id', id);

            if (error) {
              Alert.alert('Error', 'Failed to delete profile');
            } else {
              router.back();
            }
          },
        },
      ]
    );
  };

  const showPicker = <T extends string>(
    title: string,
    options: { label: string; value: T }[],
    currentValue: T,
    onSelect: (value: T) => void
  ) => {
    Alert.alert(
      title,
      undefined,
      [
        ...options.map(option => ({
          text: option.label + (currentValue === option.value ? ' ✓' : ''),
          onPress: () => onSelect(option.value),
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const showTagPicker = () => {
    if (allTags.length === 0) {
      Alert.alert('No Tags', 'Please create some tags first in Settings > Manage Tags');
      return;
    }

    Alert.alert(
      'Select Tag',
      undefined,
      [
        ...allTags.map(tag => ({
          text: tag.name + (tagId === tag.id ? ' ✓' : ''),
          onPress: () => setTagId(tag.id),
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleProviderChange = (provider: AIProvider) => {
    setAiProvider(provider);
    // Reset model to first option for new provider
    const models = MODEL_OPTIONS[provider];
    if (models && models.length > 0) {
      setModel(models[0].value);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, isDark && styles.containerDark]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: isNew ? 'New AI Profile' : 'Edit Profile',
          headerStyle: { backgroundColor: isDark ? '#111827' : '#fff' },
          headerTintColor: isDark ? '#f9fafb' : '#111827',
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              style={{ marginRight: 8 }}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#3b82f6" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={[styles.container, isDark && styles.containerDark]}>
        {/* Name */}
        <View style={styles.section}>
          <Text style={[styles.label, isDark && styles.labelDark]}>Name</Text>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Summarize Notes"
            placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
          />
        </View>

        {/* Tag */}
        <View style={styles.section}>
          <Text style={[styles.label, isDark && styles.labelDark]}>Associated Tag</Text>
          <TouchableOpacity
            style={[styles.picker, isDark && styles.pickerDark]}
            onPress={showTagPicker}
          >
            <Text style={[styles.pickerText, isDark && styles.pickerTextDark]}>
              {tagId ? allTags.find(t => t.id === tagId)?.name || 'Select tag' : 'Select tag'}
            </Text>
            <FontAwesome name="chevron-down" size={14} color={isDark ? '#6b7280' : '#9ca3af'} />
          </TouchableOpacity>
        </View>

        {/* AI Provider */}
        <View style={styles.section}>
          <Text style={[styles.label, isDark && styles.labelDark]}>AI Provider</Text>
          <TouchableOpacity
            style={[styles.picker, isDark && styles.pickerDark]}
            onPress={() => showPicker('Select Provider', AI_PROVIDER_OPTIONS, aiProvider, handleProviderChange)}
          >
            <Text style={[styles.pickerText, isDark && styles.pickerTextDark]}>
              {AI_PROVIDER_OPTIONS.find(o => o.value === aiProvider)?.label || aiProvider}
            </Text>
            <FontAwesome name="chevron-down" size={14} color={isDark ? '#6b7280' : '#9ca3af'} />
          </TouchableOpacity>
        </View>

        {/* Model */}
        <View style={styles.section}>
          <Text style={[styles.label, isDark && styles.labelDark]}>Model</Text>
          <TouchableOpacity
            style={[styles.picker, isDark && styles.pickerDark]}
            onPress={() => showPicker('Select Model', MODEL_OPTIONS[aiProvider], model, setModel)}
          >
            <Text style={[styles.pickerText, isDark && styles.pickerTextDark]}>
              {MODEL_OPTIONS[aiProvider].find(o => o.value === model)?.label || model}
            </Text>
            <FontAwesome name="chevron-down" size={14} color={isDark ? '#6b7280' : '#9ca3af'} />
          </TouchableOpacity>
        </View>

        {/* System Prompt */}
        <View style={styles.section}>
          <Text style={[styles.label, isDark && styles.labelDark]}>System Prompt (optional)</Text>
          <TextInput
            style={[styles.input, styles.promptInput, isDark && styles.inputDark]}
            value={systemPrompt}
            onChangeText={setSystemPrompt}
            placeholder="Instructions for how the AI should behave..."
            placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* User Prompt Template */}
        <View style={styles.section}>
          <Text style={[styles.label, isDark && styles.labelDark]}>User Prompt Template</Text>
          <TextInput
            style={[styles.input, styles.promptInput, isDark && styles.inputDark]}
            value={userPromptTemplate}
            onChangeText={setUserPromptTemplate}
            placeholder="Use {note_title}, {note_content}, {tags} as variables..."
            placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <Text style={styles.helpText}>
            Variables: {'{note_title}'}, {'{note_content}'}, {'{tags}'}
          </Text>
        </View>

        {/* Output Behavior */}
        <View style={styles.section}>
          <Text style={[styles.label, isDark && styles.labelDark]}>Output Behavior</Text>
          <TouchableOpacity
            style={[styles.picker, isDark && styles.pickerDark]}
            onPress={() => showPicker('Output Behavior', OUTPUT_BEHAVIOR_OPTIONS, outputBehavior, setOutputBehavior)}
          >
            <Text style={[styles.pickerText, isDark && styles.pickerTextDark]}>
              {OUTPUT_BEHAVIOR_OPTIONS.find(o => o.value === outputBehavior)?.label}
            </Text>
            <FontAwesome name="chevron-down" size={14} color={isDark ? '#6b7280' : '#9ca3af'} />
          </TouchableOpacity>
        </View>

        {/* Output Title Template (for new_note behavior) */}
        {outputBehavior === 'new_note' && (
          <View style={styles.section}>
            <Text style={[styles.label, isDark && styles.labelDark]}>Output Title Template</Text>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              value={outputTitleTemplate}
              onChangeText={setOutputTitleTemplate}
              placeholder="e.g., Summary of {note_title}"
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            />
          </View>
        )}

        {/* Trigger Mode */}
        <View style={styles.section}>
          <Text style={[styles.label, isDark && styles.labelDark]}>Trigger Mode</Text>
          <TouchableOpacity
            style={[styles.picker, isDark && styles.pickerDark]}
            onPress={() => showPicker('Trigger Mode', TRIGGER_MODE_OPTIONS, triggerMode, setTriggerMode)}
          >
            <Text style={[styles.pickerText, isDark && styles.pickerTextDark]}>
              {TRIGGER_MODE_OPTIONS.find(o => o.value === triggerMode)?.label}
            </Text>
            <FontAwesome name="chevron-down" size={14} color={isDark ? '#6b7280' : '#9ca3af'} />
          </TouchableOpacity>
          {triggerMode === 'automatic' && (
            <Text style={styles.helpText}>
              Profile will run automatically when notes are tagged with the associated tag
            </Text>
          )}
        </View>

        {/* Active Toggle */}
        <View style={[styles.section, styles.switchSection]}>
          <View>
            <Text style={[styles.label, isDark && styles.labelDark, { marginBottom: 0 }]}>
              Profile Active
            </Text>
            <Text style={styles.helpText}>Enable to use this profile</Text>
          </View>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
            thumbColor={isActive ? '#3b82f6' : '#f4f4f5'}
          />
        </View>

        {/* Delete Button (only for existing profiles) */}
        {!isNew && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <FontAwesome name="trash" size={16} color="#ef4444" />
              <Text style={styles.deleteButtonText}>Delete Profile</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  switchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  labelDark: {
    color: '#d1d5db',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  inputDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
    color: '#f9fafb',
  },
  promptInput: {
    minHeight: 100,
    paddingTop: 12,
  },
  picker: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  pickerText: {
    fontSize: 16,
    color: '#111827',
  },
  pickerTextDark: {
    color: '#f9fafb',
  },
  helpText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
});
